import loglevel from 'loglevel'
import { config } from './config'

const logger = loglevel.getLogger('vitalize-backend')

if (config.nodeEnv === 'production') {
  logger.setLevel('warn')
} else {
  logger.setLevel('debug')
}

const originalFactory = logger.methodFactory
logger.methodFactory = (methodName, logLevel, loggerName) => {
  const rawMethod = originalFactory(methodName, logLevel, loggerName)
  return (...args: unknown[]) => {
    const timestamp = new Date().toISOString()
    rawMethod(`[${timestamp}] [${methodName.toUpperCase()}]`, ...args)
  }
}
logger.rebuild()

export { logger }
