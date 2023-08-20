require('dotenv').config()

const { Plectimus } = require('.')

const plectimus = new Plectimus({ driver: 'gpt-3.5', apiKey: process.env.OPENAI_API_KEY })

plectimus.on('text-prompt-logs', console.log.bind(console))

async function makeTodo (task) {
  const result = await plectimus.send(
    'Break the task the user passes in down to a series of steps. The task to break down is the following:',
    task,
    [{
      selection: 'todos',
      params: {
        title: { type: 'string', description: 'the title of the todo list' },
        description: { type: 'multiline', description: 'description of the task, without steps' },
        steps: { type: 'array', description: 'the steps to complete' }
      }
    }],
    { maxTokens: 1024 }
  )

  console.log(result)
}

const run = async () => {
  await plectimus.test()

  await makeTodo('Make a todo list app')
}

run()
