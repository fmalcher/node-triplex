import * as request from 'request';
import * as htmlparser from 'htmlparser2';


export class RequestService {

    static readFromUri(uri: string): Promise<string> {
        return new Promise((resolve, reject) => {
            request(uri, (error, response, body) => {
                if (error) reject(error);
                resolve(body);
            });
        });
    }

    static parseHtmlToDom(rawHtml: string): Promise<any> {
        return new Promise((resolve, reject) => {
            let handler = new htmlparser.DomHandler((err, dom) => {
                resolve(dom);
            });
            let parser = new htmlparser.Parser(handler);
            parser.write(rawHtml);
            parser.end();
        });
    }
}




