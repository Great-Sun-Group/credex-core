import { SendMainMenu } from "./MainMenu";
import { SendRequestForCredexAmount } from "./OfferCredex";
import { SendOnBoardingMainMenu } from "./OnBoardingMenu";
import { SendRequestForFirstName } from "./OnBoardingSteps";

const initializations = ["hi", "hey", "hello", "hie", "menu"];

type MessageReceived = {
  body: string;
  receipent: string;
};

export function ActionDiscovery(args: MessageReceived): void {
  const lowerCaseBody = args.body.toLowerCase();
  if (initializations.includes(lowerCaseBody)) {
    // SendOnBoardingMainMenu(args.receipent); // Todo: This code should be executed executed conditionally
    SendMainMenu(args.receipent);
  }
  if (lowerCaseBody === "offer_credex") {
    SendRequestForCredexAmount(args.receipent);
  }
  if (lowerCaseBody === "new_account") {
    SendRequestForFirstName(args.receipent);
  }
}
