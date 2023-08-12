require('dotenv').config()

const { Plectimus } = require('.')

const plectimus = new Plectimus({ driver: 'gpt-3.5', apiKey: process.env.OPENAI_API_KEY })

async function makeTodo (task) {
  const result = await plectimus.send(
    'Break the task the user passes in down to a series of steps.',
    task,
    [{
      selection: 'todos',
      params: {
        tasks: { type: 'array', description: 'the tasks to complete' }
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
