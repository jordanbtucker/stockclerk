const {once} = require('events')
const {default: test} = require('ava')
const {StockClerk} = require('..')

test('publish', async t => {
  const clerk = new StockClerk()
  const promise = once(clerk, 'message')
  await clerk.publish({products: [{id: 1}]})
  const [message] = await promise
  t.is(message.products.length, 1)
  t.is(message.products[0].id, 1)
})

test('reportError', async t => {
  const clerk = new StockClerk()
  const promise = once(clerk, 'error')
  await clerk.reportError(new Error('a'))
  const [error] = await promise
  t.is(error.message, 'a')
})
