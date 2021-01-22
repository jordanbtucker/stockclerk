const {default: test} = require('ava')
const {StockClerkFactory} = require('..')

test('createFromConfig', async t => {
  const clerk = await StockClerkFactory.createFromConfig({
    options: {a: 1},
    plugins: ['./test/fixtures/test-plugin'],
  })
  t.is(clerk.options.a, 1)
  t.is(clerk.plugins.length, 1)
})

test('createFromConfigFile - js', async t => {
  const clerk = await StockClerkFactory.createFromConfigFile(
    'test/fixtures/.stockclerkrc.js',
  )
  t.is(clerk.options.a, 1)
  t.is(clerk.plugins.length, 1)
})

test('createFromConfigFile - json', async t => {
  const clerk = await StockClerkFactory.createFromConfigFile(
    'test/fixtures/.stockclerkrc.json',
  )
  t.is(clerk.options.a, 1)
  t.is(clerk.plugins.length, 1)
})

test('createFromDirectory', async t => {
  const clerk = await StockClerkFactory.createFromDirectory('test/fixtures')
  t.is(clerk.options.a, 1)
  t.is(clerk.plugins.length, 1)
})
