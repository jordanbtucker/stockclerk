import {StockClerkFactory} from '.'

async function main() {
  let configFilename: string | undefined

  const args = process.argv
  for (let i = 2; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '-c':
      case '--config':
        configFilename = args[++i]
        if (configFilename == null) {
          throw new Error(
            'You must provide filename with the --config argument',
          )
        }
        break

      default:
        throw new Error(`Unknown argument ${arg}`)
    }
  }

  const clerk = configFilename
    ? await StockClerkFactory.createFromConfigFile(configFilename)
    : await StockClerkFactory.createFromDirectory()

  await clerk.start()
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
