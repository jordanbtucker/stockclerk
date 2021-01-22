const {StockClerkPlugin} = require('../..')

class TestPlugin extends StockClerkPlugin {
  /**
   * @param {import('../..').StockClerk} clerk
   */
  async load(clerk) {
    this.clerk = clerk
  }

  async start() {
    await this.clerk.publish({products: [{id: 1}]})
  }
}

module.exports = TestPlugin
