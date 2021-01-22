import {EventEmitter} from 'events'
import {existsSync, promises as fsPromises} from 'fs'
import {extname, resolve} from 'path'
const {readFile} = fsPromises

/** The status of a product in an online store. */
export type ProductStatus<T = Record<string, unknown>> = {
  /** A unique identifier for the product. For example, a SKU.*/
  id?: string
  /** The source of the product. For example, `amazon`. */
  source?: string
  /** The name of the product. */
  name?: string
  /** Whether the product is in stock. */
  isInStock?: boolean
  /** The price of the product. */
  price?: number
  /** The currency character of the product. For example, `$`.*/
  currency?: string
  /** The URL of the product's page in the online store. */
  productURL?: string
  /** The URL that automatically adds the product to the onile store cart. */
  addToCartURL?: string
  /** Additional data for the product. For example, the product's brand, model,
   * and series. */
  data?: T
}

/** A message containing a list of statuses for products in an online store. */
export type ProductMessage<T = Record<string, unknown>> = {
  products: ProductStatus<T>[]
}

/** A plugin that interfaces with a StockClerk instance. */
export interface StockClerkPlugin {
  /**
   * Gets called with the plugin is loaded into a StockClerk instance.
   * @param clerk The StockClerk instance that loaded this plugin.
   */
  load?(clerk: StockClerk): Promise<void>

  /**
   * Gets called when a product status message is published to the StockClerk
   * instance, but before it is emitted.
   * @param message The message that was published.
   * @returns A Promise that resolves to the message to pass to additional
   * plugins or to be emitted. If the Promise resolves to `null` or `undefined`,
   * then no message will be passed or emitted.
   */
  handleMessage?<T>(
    message: ProductMessage<T>,
  ): Promise<ProductMessage<T> | void>

  /**
   * Gets called when a product status message is published to the StockClerk
   * instance, but before it is emitted.
   * @param message The message that was published.
   * @returns A Promise that resolves to the message to pass to additional
   * plugins or to be emitted. If the Promise resolves to `null` or `undefined`,
   * then no message will be passed or emitted.
   */
  handleMessage?<TSource, TResult>(
    message: ProductMessage<TSource>,
  ): Promise<ProductMessage<TResult> | void>

  /**
   * Gets called when an error is caught in or reported to the StockClerk
   * instance, but before it is emitted.
   * @param error The error that was caught or reported.
   * @returns A Promise that resovles to the error to pass to additional plugins
   * or to be emitted. If the Promise resolves to `null` or `undefined`, then no
   * error will be passed or emitted. If the Promise rejects with an error, then
   * that error will be passed or emitted.
   */
  handleError?<T extends Error = Error>(error: T): Promise<T | void>

  /**
   * Gets called when an error is caught in or reported to the StockClerk
   * instance, but before it is emitted.
   * @param error The error that was caught or reported.
   * @returns A Promise that resovles to the error to pass to additional plugins
   * or to be emitted. If the Promise resolves to `null` or `undefined`, then no
   * error will be passed or emitted. If the Promise rejects with an error, then
   * that error will be passed or emitted.
   */
  handleError?<TSource extends Error = Error, TResult extends Error = Error>(
    error: TSource,
  ): Promise<TResult>

  /**
   * Gets called when the StockClerk instance is started.
   */
  start?(): Promise<void>

  /**
   * Gets called when the StockClerk instance is stopped.
   */
  stop?(): Promise<void>
}

export class StockClerkPlugin {}

/** The configuration for a StockClerk plugin. */
export type StockClerkPluginConfig = Record<string, unknown>

/** The options for a StockClerk instance. */
export type StockClerkOptions = Record<string, unknown>

/** The configuration for a StockClerk instance. */
export type StockClerkConfig = {
  /** Options for a StockClerk instance and its plugins. */
  options?: StockClerkOptions

  /** A list of plugins to use with this StockClerk instance. */
  plugins?: string[]
}

/** The filenames to check for when loading the configuration from a file. */
const CONFIG_FILENAMES = [
  '.stockclerkrc',
  '.stockclerkrc.js',
  '.stockclerkrc.json',
]

/**
 * Gets the module ID to use when given a plugin name.
 * @param name The name of the plugin.
 * @returns The module ID derived from the plugin name.
 */
function getModuleID(name: string): string {
  // | Plugin Name | Module ID                  |
  // |-------------|----------------------------|
  // | @foo/bar    | @foo/stockclerk-plugin-bar |
  // | @foo        | @foo/stockclerk-plugin     |
  // | bar         | stockclerk-plugin-bar      |
  // | ./bar       | ./bar                      |

  // Check for scoped packages.
  let match = /^(@[^/]+)(\/([^/]+))?$/.exec(name)
  if (match) {
    if (match[2]) {
      // Scoped package with a plugin name, e.g. `@foo/bar` ->
      // `@foo/stockclerk-plugin-bar`
      return `${match[1]}/stockclerk-plugin-${match[3]}`
    } else {
      // Scoped package with the default plugin name, e.g. `@foo` ->
      // `@foo/stockclerk-plugin`
      return `${match[1]}/stockclerk-plugin`
    }
  }

  // Relative or absolute module, e.g. `./bar` -> `.`/bar.js` or
  // `./bar/index.js`
  match = /^\.?\.?\//.exec(name)
  if (match) {
    return name
  }

  // Non-scoped package, e.g. `bar` -> `stockclerk-plugin-bar`
  return `stockclerk-plugin-${name}`
}

/** A factory class for creating StockClerk instances from configuration files
 * and objects. */
export class StockClerkFactory {
  /**
   * Creates a StockClerk instance from a configuration object.
   * @param config The configuration object.
   * @param workingDirectory The directory to use as the starting point for
   * resolving plugin modules. If omitted, the current working directory is
   * used.
   * @returns A StockClerk instance with the provided configuration.
   */
  static async createFromConfig(
    config: StockClerkConfig,
    workingDirectory?: string,
  ): Promise<StockClerk> {
    const clerk = new StockClerk(config.options)

    if (config.plugins) {
      if (workingDirectory == null) {
        workingDirectory = process.cwd()
      }

      for (const name of config.plugins) {
        const id = getModuleID(name)
        const absoluteID = require.resolve(id, {paths: [workingDirectory]})
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const plugin = require(absoluteID) as StockClerkPlugin
        await clerk.loadPlugin(plugin)
      }
    }

    return clerk
  }

  /**
   * Creates a StockClerk instance from a configuration file.
   * @param filename The filename of the configuration file.
   * @param workingDirectory The directory to use as the starting point for
   * resolving plugin modules. If omitted, the current working directory is
   * used.
   * @returns A StockClerk instance with the provided configuration.
   */
  static async createFromConfigFile(
    filename: string,
    workingDirectory?: string,
  ): Promise<StockClerk> {
    const filePath = resolve(filename)
    let config: StockClerkConfig = {}
    if (extname(filePath) === '.js') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      config = require(filePath) as StockClerkConfig
    } else {
      const json = await readFile(filePath, 'utf8')
      config = JSON.parse(json) as StockClerkConfig
    }

    return this.createFromConfig(config, workingDirectory)
  }

  /**
   * Creates a StockClerk instance using the configuration file in the given
   * directory, if one exists.
   * @param path The path of the directory containing the configuration file, if
   * any. If omitted, the current working directory will be used.
   * @returns A StockClerk instance with the provided configuration, if any.
   */
  static async createFromDirectory(path?: string): Promise<StockClerk> {
    if (path == null) {
      path = process.cwd()
    }

    for (const filename of CONFIG_FILENAMES) {
      const filePath = resolve(path, filename)
      if (existsSync(filePath)) {
        return this.createFromConfigFile(filePath)
      }
    }

    return new StockClerk()
  }
}

/** Facilitates the checking of product statuses in online stores. */
export interface StockClerk {
  /**
   * Emits a message containing the statuses of products in online stores.
   * @param event The event name.
   * @param message A message containing the statuses of products in online stores.
   * @returns A value indicating whether the message was emitted.
   */
  emit<T>(event: 'message', message: ProductMessage<T>): boolean

  /**
   * Emits an error.
   * @param event The event name.
   * @param error An error to emit.
   * @returns A value indicating whether the error was emitted.
   */
  emit<T extends Error = Error>(event: 'error', error: T): boolean

  /**
   * Registers a listener that gets called when a message containing the
   * statuses of products in online stores is emitted.
   * @param event The event name.
   * @param listener A function to handle the emitted message.
   * @returns The StockClerk instance.
   */
  on<T>(event: 'message', listener: (message: ProductMessage<T>) => void): this

  /**
   * Registers a listener that gets called when an error is emitted.
   * @param event The event name.
   * @param listener A function to handle the emitted error.
   * @returns The StockClerk instance.
   */
  on<T extends Error = Error>(
    event: 'error',
    listener: (error: T) => void,
  ): this
}

export class StockClerk extends EventEmitter {
  /** Options for the StockClerk instance and its plugins. */
  options: StockClerkOptions = {}

  /** A list of plugins that have been loaded into the StockClerk instance. */
  plugins: StockClerkPlugin[] = []

  /**
   * Creates a StockClerk instance.
   * @param options Options for the StockClerk instance and its plugins.
   */
  constructor(options?: StockClerkOptions) {
    super()
    this.options = options ?? {}
  }

  /**
   * Loads a plugin.
   * @param plugin The plugin to load.
   * @returns A Promise that resolves with the plugin has been loaded.
   */
  async loadPlugin(plugin: StockClerkPlugin): Promise<void> {
    this.plugins.push(plugin)

    if (plugin.load) {
      await plugin.load(this)
    }
  }

  /**
   * Publishes a message that contains the statuses of products in online
   * stores.
   * @param message The message to publish.
   * @returns A Promise that resolves to a value indicating whether the message
   * was emitted.
   */
  async publish<T>(message: ProductMessage<T>): Promise<boolean> {
    try {
      let handledMessage: ProductMessage<T> | void = message
      for (const plugin of this.plugins) {
        if (handledMessage == null) {
          break
        }

        if (plugin.handleMessage) {
          handledMessage = await plugin.handleMessage(handledMessage)
        }
      }

      if (handledMessage == null) {
        return false
      }

      return this.emit<T>('message', handledMessage)
    } catch (err) {
      return this.handleError(err)
    }
  }

  /**
   * Reports an error.
   * @param error The error to report.
   * @returns A Promise that resolves to a value that indicates whether the
   * error was emitted.
   */
  async reportError<T extends Error = Error>(error: T): Promise<boolean> {
    return this.handleError(error)
  }

  /**
   * Handles an error that ocurred during a message publication.
   * @param error The error to handle.
   * @returns A Promise that resolves to a value that indicates whether the
   * error was emitted.
   */
  async handleError(error: Error): Promise<boolean> {
    let handledError: Error | void = error
    for (const plugin of this.plugins) {
      if (handledError == null) {
        break
      }

      if (plugin.handleError) {
        try {
          handledError = await plugin.handleError(handledError)
        } catch (err) {
          handledError = err as Error
        }
      }
    }

    if (handledError == null) {
      return false
    }

    return this.emit('error', handledError)
  }

  /**
   * Starts the loaded plugins.
   * @returns A Promise that resolves once all plugins have started.
   */
  async start(): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.start) {
        await plugin.start()
      }
    }
  }

  /**
   * Stops the loaded plugins.
   * @returns A Promise that resolves once all plugins have stopped.
   */
  async stop(): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.stop) {
        await plugin.stop()
      }
    }
  }
}
