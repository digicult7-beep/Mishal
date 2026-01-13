
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupHierarchy() {
    const userId = 'fe4fc391-9b4e-4605-b302-78a774d8559c'

    console.log('Setting up hierarchy for user:', userId)

    // 1. Create Client
    const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
            name: 'Demo Client',
            cc_id: userId
        })
        .select()
        .single()

    if (clientError) {
        console.error('Error creating client:', clientError)
        return
    }
    console.log('Created Client:', client.id)

    // 2. Create Workspace
    const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
            name: 'Demo Workspace',
            client_id: client.id
        })
        .select()
        .single()

    if (workspaceError) {
        console.error('Error creating workspace:', workspaceError)
        return
    }
    console.log('Created Workspace:', workspace.id)

    // 3. Create Department
    const { data: department, error: deptError } = await supabase
        .from('departments')
        .insert({
            name: 'Engineering',
            workspace_id: workspace.id
        })
        .select()
        .single()

    if (deptError) {
        console.error('Error creating department:', deptError)
        return
    }
    console.log('Created Department:', department.id)

    console.log('Hierarchy setup complete!')
}

setupHierarchy()
