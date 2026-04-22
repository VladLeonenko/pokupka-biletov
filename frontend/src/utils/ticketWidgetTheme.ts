/** Палитра плавающих виджетов на светлой витрине билетов */

export type ChatWidgetTheme = {
  accent: string;
  accentHover: string;
  fabBg: string;
  fabIcon: string;
  fabShadow: string;
  headerBg: string;
  headerFg: string;
  threadBg: string;
  threadGradient: string;
  emptyHint: string;
  bubbleClientBg: string;
  bubbleClientFg: string;
  bubbleOtherBg: string;
  bubbleOtherFg: string;
  bubbleOtherShadow: string;
  linkFg: string;
  linkHover: string;
  inputBarBg: string;
  inputBarBorder: string;
  inputBg: string;
  inputFg: string;
  inputPlaceholder: string;
  inputBorder: string;
  inputBorderHover: string;
  inputBorderFocus: string;
  sendBg: string;
  sendFg: string;
  sendDisabled: string;
};

export function getChatWidgetTheme(tickets: boolean): ChatWidgetTheme {
  if (tickets) {
    return {
      accent: '#ff4e18',
      accentHover: '#e64514',
      fabBg: '#ff4e18',
      fabIcon: '#ffffff',
      fabShadow: '0 8px 28px rgba(255, 78, 24, 0.38)',
      headerBg: '#ff4e18',
      headerFg: '#ffffff',
      threadBg: '#f4f6f9',
      threadGradient: 'linear-gradient(180deg, #fafbfc 0%, #eef1f6 100%)',
      emptyHint: 'rgba(0, 0, 0, 0.45)',
      bubbleClientBg: '#ff4e18',
      bubbleClientFg: '#ffffff',
      bubbleOtherBg: '#ffffff',
      bubbleOtherFg: '#111111',
      bubbleOtherShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
      linkFg: '#0d47a1',
      linkHover: '#1565c0',
      inputBarBg: '#ffffff',
      inputBarBorder: 'rgba(0, 0, 0, 0.08)',
      inputBg: '#ffffff',
      inputFg: '#111111',
      inputPlaceholder: 'rgba(0, 0, 0, 0.45)',
      inputBorder: 'rgba(0, 0, 0, 0.18)',
      inputBorderHover: 'rgba(0, 0, 0, 0.28)',
      inputBorderFocus: '#ff4e18',
      sendBg: '#ff4e18',
      sendFg: '#ffffff',
      sendDisabled: '#cccccc',
    };
  }
  return {
    accent: '#ffbb00',
    accentHover: '#e6a800',
    fabBg: '#ffbb00',
    fabIcon: '#ffffff',
    fabShadow: '0 4px 12px rgba(0,0,0,0.15)',
    headerBg: '#ffbb00',
    headerFg: '#ffffff',
    threadBg: '#0f0f0f',
    threadGradient: 'linear-gradient(to bottom, #0f0f0f 0%, #1a1a1a 100%)',
    emptyHint: 'rgba(255, 255, 255, 0.5)',
    bubbleClientBg: '#ffbb00',
    bubbleClientFg: '#ffffff',
    bubbleOtherBg: '#141414',
    bubbleOtherFg: '#ffffff',
    bubbleOtherShadow: '0 1px 2px rgba(0,0,0,0.4)',
    linkFg: '#ffffff',
    linkHover: '#e0e0e0',
    inputBarBg: '#1a1a1a',
    inputBarBorder: '#333333',
    inputBg: '#2a2a2a',
    inputFg: '#ffffff',
    inputPlaceholder: 'rgba(255, 255, 255, 0.5)',
    inputBorder: '#444444',
    inputBorderHover: '#555555',
    inputBorderFocus: '#ffbb00',
    sendBg: '#ffbb00',
    sendFg: '#ffffff',
    sendDisabled: '#ccc',
  };
}
