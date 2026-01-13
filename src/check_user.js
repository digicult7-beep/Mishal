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

async function checkUser() {
    const userId = 'fe4fc391-9b4e-4605-b302-78a774d8559c'
    const targetDeptId = '0462aae0-189d-484c-8659-ff4ca92dea71'

    console.log('Checking profile...')
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single()
    console.log('Profile:', profile)

    console.log('\nChecking Clients for CC...')
    const { data: clients } = await supabase.from('clients').select('*').eq('cc_id', userId)
    console.log('Clients owned by CC:', clients)

    console.log('\nInspecting Target Department:', targetDeptId)
    const { data: dept } = await supabase.from('departments').select('*').eq('id', targetDeptId).single()

    if (dept) {
        console.log('Department found:', dept)
        const { data: workspace } = await supabase.from('workspaces').select('*').eq('id', dept.workspace_id).single()
        console.log('Parent Workspace:', workspace)

        if (workspace) {
            const { data: client } = await supabase.from('clients').select('*').eq('id', workspace.client_id).single()
            console.log('Parent Client:', client)
            console.log('Client CC ID:', client?.cc_id)
            console.log('Match?', client?.cc_id === userId)
        }
    } else {
        console.log('Department NOT found')
    }
}

checkUser()
