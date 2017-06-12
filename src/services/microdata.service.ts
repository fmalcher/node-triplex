import { TripleSet } from '../models/triple-set';
import * as htmlparser from 'htmlparser2';

export class MicrodataService {
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

    static getTriplesFromDom(dom: any) {

        let parseOneNode = nodes => {
            let results = [];
            nodes
                .filter(n => n.type === 'tag')
                .forEach(tag => {
                    if (tag.attribs.hasOwnProperty('itemprop')) {
                        results.push(tag.attribs.itemprop);
                    }
                    if (!tag.attribs.hasOwnProperty('itemscope')) {
                        results = [...results, ...parseOneNode(tag.children)];
                    }
                });
            console.log(results);
            return results;
        }

        parseOneNode(dom);


        return new Promise((resolve, reject) => resolve('foo'));
    }
}
