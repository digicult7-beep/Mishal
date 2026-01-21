import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load environment variables from ../app/.env
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../app/.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY // or SERVICE_ROLE_KEY if needed for RLS bypass

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in app/.env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function migrate() {
    console.log('Starting migration...')

    // Fetch tasks with legacy content
    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, subtasks_content')
        .not('subtasks_content', 'is', null)
        .neq('subtasks_content', '')

    if (error) {
        console.error('Error fetching tasks:', error)
        return
    }

    console.log(`Found ${tasks.length} tasks to migrate.`)

    for (const task of tasks) {
        const html = task.subtasks_content
        const subtasks = []

        // Regex to find list items with data-type="taskItem"
        // Example: <li data-type="taskItem" data-checked="true">Task text</li>
        const regex = /<li[^>]*data-type="taskItem"[^>]*data-checked="(true|false)"[^>]*>(.*?)<\/li>/g
        let match

        while ((match = regex.exec(html)) !== null) {
            const isChecked = match[1] === 'true'
            // Simple text cleanup: remove parsed HTML tags inside the text if any, though rich text might have formatting
            // For now, we'll keep the text content clean.
            // Since specific HTML structure might vary, let's try to strip tags from the content
            let text = match[2].replace(/<[^>]*>?/gm, '').trim()

            if (text) {
                subtasks.push({
                    id: crypto.randomUUID(),
                    text: text,
                    completed: isChecked
                })
            }
        }

        if (subtasks.length > 0) {
            const { error: updateError } = await supabase
                .from('tasks')
                .update({ subtasks: subtasks })
                .eq('id', task.id)

            if (updateError) {
                console.error(`Failed to update task ${task.id}:`, updateError)
            } else {
                console.log(`Migrated task ${task.id}: ${subtasks.length} subtasks`)
            }
        } else {
            console.log(`No subtasks found in HTML for task ${task.id}`)
        }
    }

    console.log('Migration complete.')
}

migrate()
