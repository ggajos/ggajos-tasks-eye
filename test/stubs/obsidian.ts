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
  path: string;
  extension: string;

  constructor(path = "") {
    this.path = path;
    this.extension = path.includes(".") ? (path.split(".").pop() ?? "") : "md";
  }
}

export class TFolder {
  path: string;
  children: Array<TFile | TFolder>;

  constructor(path = "", children: Array<TFile | TFolder> = []) {
    this.path = path;
    this.children = children;
  }
}
