
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUser() {
    const userId = 'fe4fc391-9b4e-4605-b302-78a774d8559c'

    console.log('Checking profile...')
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

    if (profileError) {
        console.error('Profile Error:', profileError)
    } else {
        console.log('Profile:', profile)
    }

    console.log('\nChecking Clients...')
    const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('cc_id', userId)

    if (clientError) {
        console.error('Client Error:', clientError)
    } else {
        console.log('Clients:', clients)

        if (clients && clients.length > 0) {
            const clientId = clients[0].id
            console.log('\nChecking Workspaces for Client:', clientId)
            const { data: workspaces, error: workspaceError } = await supabase
                .from('workspaces')
                .select('*')
                .eq('client_id', clientId)

            if (workspaceError) {
                console.error('Workspace Error:', workspaceError)
            } else {
                console.log('Workspaces:', workspaces)

                if (workspaces && workspaces.length > 0) {
                    const workspaceId = workspaces[0].id
                    console.log('\nChecking Departments for Workspace:', workspaceId)
                    const { data: departments, error: deptError } = await supabase
                        .from('departments')
                        .select('*')
                        .eq('workspace_id', workspaceId)

                    if (deptError) {
                        console.error('Department Error:', deptError)
                    } else {
                        console.log('Departments:', departments)
                    }
                }
            }
        }
    }
}

checkUser()
