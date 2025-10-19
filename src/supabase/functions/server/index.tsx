

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createClient } from "@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-db46f9ec/health", (c) => {
  return c.json({ status: "ok" });
});

// Signup endpoint
app.post("/make-server-db46f9ec/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    // Create Supabase admin client (support both Deno and Node.js environments)
    const supabase = createClient(
      (globalThis as any).Deno?.env?.get('SUPABASE_URL') ?? process.env.SUPABASE_URL ?? '',
      (globalThis as any).Deno?.env?.get('SUPABASE_SERVICE_ROLE_KEY') ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    );

    // Create user with admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name || '' },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });

    if (error) {
      console.error('Error creating user:', error);
      return c.json({ error: error.message }, 400);
    }

    if (!data.user) {
      return c.json({ error: 'Failed to create user' }, 500);
    }

    // Sign in the user to get access token (support both Deno and Node.js environments)
    const publicSupabase = createClient(
      (globalThis as any).Deno?.env?.get('SUPABASE_URL') ?? process.env.SUPABASE_URL ?? '',
      (globalThis as any).Deno?.env?.get('SUPABASE_ANON_KEY') ?? process.env.SUPABASE_ANON_KEY ?? '',
    );

    const { data: sessionData, error: signInError } = await publicSupabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !sessionData.session) {
      console.error('Error signing in after signup:', signInError);
      return c.json({ error: 'User created but failed to sign in. Please try logging in.' }, 500);
    }

    return c.json({
      success: true,
      user: data.user,
      access_token: sessionData.session.access_token,
    });
  } catch (error) {
    console.error('Error in signup endpoint:', error);
    return c.json({ error: `Signup failed: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// Upload a resource
app.post("/make-server-db46f9ec/upload", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const tagsJson = formData.get('tags') as string;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ 
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
      }, 400);
    }

    // Parse tags
    let tags: string[] = [];
    if (tagsJson) {
      try {
        tags = JSON.parse(tagsJson);
      } catch (e) {
        console.error('Error parsing tags:', e);
      }
    }

    // Generate unique ID for the resource
    const id = crypto.randomUUID();
    const fileName = file.name;
    const fileType = file.type;
    const fileSize = file.size;
    const uploadDate = new Date().toISOString();

    // Convert file to base64
    const fileBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(fileBuffer);
    
    // Convert to base64 using a more reliable method
    let binaryString = '';
    const chunkSize = 8192; // Process in chunks to avoid stack overflow
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64Data = btoa(binaryString);

    // Store file data and metadata in KV store
    const resource = {
      id,
      name: fileName,
      type: fileType,
      size: fileSize,
      uploadDate,
      tags,
      data: base64Data,
    };

    console.log(`Storing resource ${id}: ${fileName}, size: ${fileSize}, tags: ${tags.join(', ')}, base64 length: ${base64Data.length}`);
    
    await kv.set(`resource:${id}`, resource);

    // Return metadata without the data
    const { data, ...metadata } = resource;

    return c.json({ success: true, resource: metadata });
  } catch (error) {
    console.error('Error in upload endpoint:', error);
    return c.json({ error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// Get all resources
app.get("/make-server-db46f9ec/resources", async (c) => {
  try {
    const resources = await kv.getByPrefix('resource:');
    
    // Remove the base64 data from the response and add download URL
    const resourcesWithoutData = resources.map((resource) => {
      const { data, ...metadata } = resource;
      return {
        ...metadata,
        downloadUrl: `/make-server-db46f9ec/download/${resource.id}`,
      };
    });

    // Sort by upload date (newest first)
    resourcesWithoutData.sort((a, b) => 
      new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
    );

    return c.json({ resources: resourcesWithoutData });
  } catch (error) {
    console.error('Error fetching resources:', error);
    return c.json({ error: `Failed to fetch resources: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// Download a resource
app.get("/make-server-db46f9ec/download/:id", async (c) => {
  try {
    const id = c.req.param('id');
    
    // Get resource from KV store
    const resource = await kv.get(`resource:${id}`);
    
    if (!resource) {
      console.error(`Resource not found for id: ${id}`);
      return c.json({ error: 'Resource not found' }, 404);
    }

    if (!resource.data) {
      console.error(`Resource data is missing for id: ${id}`, resource);
      return c.json({ error: 'Resource data is missing' }, 500);
    }

    if (typeof resource.data !== 'string') {
      console.error(`Resource data is not a string for id: ${id}`, typeof resource.data);
      return c.json({ error: 'Invalid resource data format' }, 500);
    }

    // Decode base64 data
    let bytes: Uint8Array;
    try {
      const binaryString = atob(resource.data);
      bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
    } catch (decodeError) {
      console.error(`Failed to decode base64 data for id: ${id}`, decodeError);
      console.error(`Data preview:`, resource.data.substring(0, 100));
      return c.json({ error: 'Failed to decode file data' }, 500);
    }

    // Return file with proper headers: ensure we pass a real ArrayBuffer to Blob
    // (handle ArrayBuffer vs other ArrayBufferLike such as SharedArrayBuffer)
    const arrayBuffer = (bytes.buffer instanceof ArrayBuffer)
      ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
      : (() => {
          const ab = new ArrayBuffer(bytes.byteLength);
          new Uint8Array(ab).set(bytes);
          return ab;
        })();

    return new Response(new Blob([arrayBuffer]), {
      headers: {
        'Content-Type': resource.type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${resource.name}"`,
        'Content-Length': resource.size.toString(),
      },
    });
  } catch (error) {
    console.error('Error downloading resource:', error);
    return c.json({ error: `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// Delete a resource
app.delete("/make-server-db46f9ec/resources/:id", async (c) => {
  try {
    const id = c.req.param('id');
    
    // Get resource metadata
    const resource = await kv.get(`resource:${id}`);
    
    if (!resource) {
      return c.json({ error: 'Resource not found' }, 404);
    }

    // Delete from KV store
    await kv.del(`resource:${id}`);

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting resource:', error);
    return c.json({ error: `Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// Use a safe runtime check so TypeScript won't error when 'Deno' is not defined.
// In Deno this will call Deno.serve(app.fetch); in other runtimes it will be a no-op.
;(globalThis as any).Deno?.serve?.(app.fetch);
