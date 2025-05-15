// create query keys
export const createQueryKeys = <T extends string>(namespace: T) => {
  return {
    namespace: [namespace] as const,
    all: () => [namespace, 'all'] as const,
    list: () => [namespace, 'list'] as const,
    detail: (id: string) => [namespace, 'detail', id] as const,
    create: () => [namespace, 'create'] as const,
    update: (id: string) => [namespace, 'update', id] as const,
    delete: (id: string) => [namespace, 'delete', id] as const,
    custom: <K extends string>(key: K, ...args: any[]) => [namespace, key, ...args] as const
  };
};
