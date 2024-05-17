export type TextBody = {
  from: string;
  id: string;
  timestamp: string;
  text: { body: string };
  type: string;
};

type ButtonReply = {
  type: string;
  button_reply: { id: string; title: string };
};

type ListReply = {
  type: string;
  list_reply: { id: string; title: string };
};

export type Interactive = {
  from: string;
  id: string;
  timestamp: string;
  interactive?: ButtonReply | ListReply | any;
  type: string;
};
