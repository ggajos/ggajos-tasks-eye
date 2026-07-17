export const noticeLog: string[] = [];

export async function requestUrl(): Promise<never> {
  throw new Error("requestUrl is not configured in unit tests");
}

export class Notice {
  message: string;

  constructor(message: string) {
    this.message = message;
    noticeLog.push(message);
  }
}

export class TFile {
  path = "";
  extension = "md";
}
