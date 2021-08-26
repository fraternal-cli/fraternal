import { Transform } from 'stream';

interface CustomTransformStream extends Transform {
  _incompleteLine?: string;
}

export const createLineTransformStream = (transformFn: (line: string) => string): Transform => {
  const stream: CustomTransformStream = new Transform();

  stream._transform = (chunk: Buffer, _, done) => {
    let data = chunk.toString();

    if (typeof stream._incompleteLine === 'string') {
      data = stream._incompleteLine + data;
    }

    const lines = data.split('\n');
    stream._incompleteLine = lines.pop();

    for (const line of lines) {
      stream.push(transformFn(line) + '\n');
    }

    done();
  };

  stream._flush = (done) => {
    if (typeof stream._incompleteLine === 'string') {
      stream.push(transformFn(stream._incompleteLine) + '\n');
    }

    stream._incompleteLine = undefined;

    done();
  };

  return stream;
};
