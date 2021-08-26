declare module '@root/walk' {
  import fs from 'fs';

  namespace Walk {
    function walk(
      pathname: string,
      promiseWalker: (err: Error, pathname: string, dirent: fs.Dirent) => Promise<void>
    ): Promise<void>;
  }

  export = Walk;
}
