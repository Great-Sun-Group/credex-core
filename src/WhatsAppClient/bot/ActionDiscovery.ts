import { SendMainMenu } from "./MainMenu";

const initializations = ["hi", "hey", "hello", "hie", "menu"];

type MessageReceived = {
  body: string;
  receipent: string;
};

export function ActionDiscovery(args: MessageReceived): void {
  const lowerCaseBody = args.body.toLowerCase();
  if (initializations.includes(lowerCaseBody)) {
    SendMainMenu(args.receipent);
  }
}
