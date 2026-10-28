
const commonStyles = {
  heading(depth) {
    const size = { 1: 22, 2: 19, 3: 17, 4: 16, 5: 16, 6: 16 }[depth] ?? 16;
    return {
      display: 'block',
      fontSize: size,
      fontWeight: 600,
      lineHeight: 1.35,
      marginBottom: depth <= 2 ? 6 : 4,
    };
  },

  paragraph() {
    return {
      display: 'block',
      fontSize: 16,
      lineHeight: 1.7,
      marginBottom: 6,
    };
  },

  code() {
    return {
      display: 'block',
      marginBottom: 10,
      padding: '10px 12px',
      backgroundColor: '#f6f7f9',
      borderRadius: 8,
      fontSize: 13,
      lineHeight: 1.6,
      whiteSpace: 'pre-wrap',
    };
  },

  quote() {
    return {
      display: 'flex',
      flexDirection: 'column',
      marginBottom: 10,
      padding: '6px 12px',
      borderLeft: '3px solid #d0d7de',
      backgroundColor: '#fafbfc',
      color: '#57606a',
      fontSize: 15,
      lineHeight: 1.7,
    };
  },

  list() {
    return {
      display: 'flex',
      flexDirection: 'column',
      marginBottom: 6,
    };
  },

  listItem() {
    return {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 4,
    };
  },

  marker() {
    return {
      width: 18,
      flexShrink: 0,
      fontSize: 16,
      lineHeight: 1.7,
      color: '#6b7280',
    };
  },

  listText() {
    return {
      display: 'block',
      fontSize: 16,
      lineHeight: 1.7,
    };
  },

  table() {
    return {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      marginBottom: 10,
      borderTop: '1px solid #e8ebef',
      borderBottom: '1px solid #e8ebef',
      borderRadius: 8,
      overflow: 'hidden',
    };
  },

  cell(header) {
    return {
      display: 'block',
      flex: 1,
      minWidth: 0,
      padding: '5px 10px',
      fontSize: 14,
      lineHeight: 1.5,
      fontWeight: header ? 600 : 400,
      backgroundColor: header ? '#f7f8fa' : '#ffffff',
      borderBottom: '1px solid #e8ebef',
    };
  },

  hr() {
    return { height: 1, backgroundColor: '#e8ebef', marginBottom: 14 };
  },

  strong() {
    return { fontWeight: 600 };
  },

  em() {
    return { fontStyle: 'italic' };
  },

  del() {
    return { textDecoration: 'line-through' };
  },

  codeSpan() {
    return {
      fontSize: 14,
      backgroundColor: '#eef0f3',
      padding: '1px 5px',
      borderRadius: 4,
    };
  },

  link() {
    return { color: '#2563eb', textDecoration: 'underline' };
  },
};

/** 白卡片直接铺满图片，气泡边界就是图片边界。 */
export function bubbleFrame(content, { width }) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width,
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
            width: width - 42,
            padding: '18px 20px',
            backgroundColor: '#ffffff',
            borderRadius: 14,
            border: '1px solid #e8ebef',
          },
          children: content,
        },
      }],
    },
  };
}


export const bubble = {
  name: 'bubble',
  ...commonStyles,
  frame: bubbleFrame,
};
