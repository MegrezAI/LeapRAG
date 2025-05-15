import { docs, meta } from '../../../.source';
import { createMDXSource } from 'fumadocs-mdx';
import { loader } from 'fumadocs-core/source';
import { docsI18n } from '../constants/language';
export const source = loader({
  baseUrl: '/docs',
  i18n: docsI18n,
  source: createMDXSource(docs, meta)
});

export const createSource = () => {
  return loader({
    baseUrl: '/docs',
    source: createMDXSource(docs, meta)
  });
};
