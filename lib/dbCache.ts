const dbCache: Record<string, any> = {}

export const getDbConnectionDetails = (id: string) => {
  return dbCache[id]
}

export const setDbConnectionDetails = (id: string, details: any) => {
  dbCache[id] = details
}