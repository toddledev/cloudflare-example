export const loadJsonFile = async <T>(path: string): Promise<T | undefined> => {
  try {
    const content = await import(path)
    return JSON.parse(content.default) as T
  } catch (e) {
    console.error(`Unable to load ${path}`, e instanceof Error ? e.message : e)
  }
}
