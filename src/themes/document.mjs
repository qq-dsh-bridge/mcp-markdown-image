import { bubble } from './bubble.mjs';

/** 纯白整页，适合导出文档截图。 */
export function documentFrame(content, { width }) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width,
        padding: 24,
        backgroundColor: '#ffffff',
        fontSize: 16,
        lineHeight: 1.7,
        color: '#1f2329',
      },
      children: [{
        type: 'div',
        props: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            width: width - 48,
          },
          children: content,
        },
      }],
    },
  };
}

export const document = {
  ...bubble,
  name: 'document',
  frame: documentFrame,
};
