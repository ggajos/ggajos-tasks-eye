export const noticeLog: string[] = [];

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
