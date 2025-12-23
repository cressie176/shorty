import { ansiColorFormatter as ansi, configure, getConsoleSink, getLogger, jsonLinesFormatter as json } from '@logtape/logtape';
import { getPrettyFormatter as pretty } from '@logtape/pretty';

import { Events as ApplicationEvents } from '../infra/Application.js';
import type { LogLevel } from '../infra/Logger.js';

export default async function initLogging(config: any) {
  const formatterName = config?.formatter || 'json';

  const formatters = {
    ansi,
    json,
    pretty: pretty(config.formatters?.pretty || {}),
  };

  const formatter = formatters[formatterName as keyof typeof formatters] || json;

  await configure({
    sinks: {
      console: getConsoleSink({ formatter }),
    },
    loggers: [
      {
        category: ['shorty'],
        lowestLevel: config.level,
        sinks: ['console'],
      },
      {
        category: ['logtape', 'meta'],
        lowestLevel: 'warning',
        sinks: ['console'],
      },
    ],
  });

  const logger = getLogger(['shorty']);
  addLogListeners(logger);
}

function addLogListeners(logger: any) {
  process.on(ApplicationEvents.LOG as any, (data: { level: LogLevel; message: string; context: any }) => {
    const method = data.level.toLowerCase();
    (logger as any)[method](data.message, data.context);
  });
}
