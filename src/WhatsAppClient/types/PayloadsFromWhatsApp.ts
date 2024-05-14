export type TextBody = {
  from: string;
  id: string;
  timestamp: string;
  text: { body: string };
  type: string;
};

export type Interactive = {
  from: string;
  id: string;
  timestamp: string;
  interactive: { type: string; button_reply: { id: string; title: string } };
  type: string;
};
