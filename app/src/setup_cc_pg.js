
import pg from 'pg'
const { Client } = pg

const connectionString = 'postgresql://postgres:postgres@localhost:54322/postgres'

const client = new Client({
    connectionString,
})

async function setupHierarchy() {
    const userId = 'fe4fc391-9b4e-4605-b302-78a774d8559c'

    try {
        await client.connect()
        console.log('Connected to DB')

        // 1. Create Client
        const insertClientText = 'INSERT INTO public.clients (name, cc_id) VALUES ($1, $2) RETURNING id'
        const clientRes = await client.query(insertClientText, ['Demo Client', userId])
        const clientId = clientRes.rows[0].id
        console.log('Created Client:', clientId)

        // 2. Create Workspace
        const insertWorkspaceText = 'INSERT INTO public.workspaces (name, client_id) VALUES ($1, $2) RETURNING id'
        const workspaceRes = await client.query(insertWorkspaceText, ['Demo Workspace', clientId])
        const workspaceId = workspaceRes.rows[0].id
        console.log('Created Workspace:', workspaceId)

        // 3. Create Department
        const insertDeptText = 'INSERT INTO public.departments (name, workspace_id) VALUES ($1, $2) RETURNING id'
        const deptRes = await client.query(insertDeptText, ['Engineering', workspaceId])
        const deptId = deptRes.rows[0].id
        console.log('Created Department:', deptId)

        console.log('Hierarchy setup complete!')
    } catch (err) {
        console.error('Error executing query', err.stack)
    } finally {
        await client.end()
    }
}

setupHierarchy()
