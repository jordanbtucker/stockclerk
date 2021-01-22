const {default: test} = require('ava')
const {StockClerk} = require('..')

test('load', async t => {
  t.plan(1)
  const clerk = new StockClerk()
  await clerk.loadPlugin({
    async load() {
      t.pass()
    },
  })
})

test('start', async t => {
  t.plan(1)
  const clerk = new StockClerk()
  await clerk.loadPlugin({
    async start() {
      t.pass()
    },
  })
  await clerk.start()
})

test('stop', async t => {
  t.plan(1)
  const clerk = new StockClerk()
  await clerk.loadPlugin({
    async stop() {
      t.pass()
    },
  })
  await clerk.stop()
})

test('handleMessage', async t => {
  t.plan(2)
  const clerk = new StockClerk()
  await clerk.loadPlugin({
    async handleMessage(message) {
      t.is(message.products.length, 1)
      t.is(message.products[0].id, 1)
    },
  })
  await clerk.publish({products: [{id: 1}]})
})

test('handleError', async t => {
  t.plan(1)
  const clerk = new StockClerk()
  await clerk.loadPlugin({
    async handleMessage() {
      throw new Error('a')
    },
    async handleError(error) {
      t.is(error.message, 'a')
    },
  })
  await clerk.publish({products: [{id: 1}]})
})

test('handleError - transform error', async t => {
  t.plan(1)
  const clerk = new StockClerk()
  await clerk.loadPlugin({
    async handleMessage() {
      throw new Error('a')
    },
    async handleError() {
      return new Error('b')
    },
  })
  await clerk.loadPlugin({
    async handleError(error) {
      t.is(error.message, 'b')
    },
  })
  await clerk.publish({products: [{id: 1}]})
})

test('handleError - eat error', async t => {
  t.plan(0)
  const clerk = new StockClerk()
  await clerk.loadPlugin({
    async handleMessage() {
      throw new Error('a')
    },
    async handleError() {
      return null
    },
  })
  await clerk.loadPlugin({
    async handleError() {
      t.fail()
    },
  })
  await clerk.publish({products: [{id: 1}]})
})
