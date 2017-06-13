import { QueryResponse } from './../models/query-response';
import { TripleObject } from './../models/triple-object';
import { Triple } from '../models/triple';
import * as htmlparser from 'htmlparser2';
import * as isUrl from 'is-url';

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

    static getTriplesFromDom(dom: any, uri: string) {

        interface Item {
            id: number,
            triple: Triple,
            depth: number
        }

        let results: Item[] = [];
        let response: QueryResponse = {triples: [], uri: uri, resourceFormat: 'microdata'};
        let scopeCounter = 0;
        let tripleCounter = 0;

        let parseOneNode = (nodes, currentDepth: number) => {
            let depth = currentDepth + 1;
            nodes.filter(n => n.type === 'tag').forEach(tag => {
                if (tag.attribs.hasOwnProperty('itemprop')) {
                    let index = results.indexOf(results.filter(i => i.depth < depth).sort(i => i.id)[0]);
                    if (results[index].triple.predicate == null) {
                        results[index].triple.predicate = tag.attribs.itemprop;
                        results[index].triple.object = this.getObject(tag.children);
                    } else {
                        results.push({id: ++tripleCounter, triple: {subject: results[index].triple.subject, predicate: tag.attribs.itemprop, object: this.getObject(tag.children)}, depth: results[index].depth});
                    }
                }
                if (tag.attribs.hasOwnProperty('itemscope')) {
                    scopeCounter++;
                    results.push({id: ++tripleCounter, triple: {subject: String(scopeCounter), predicate: null, object: null}, depth: depth});
                }
                if (tag.children) parseOneNode(tag.children, depth);
            });
        }

        parseOneNode(dom, 0);

        response.triples = results.map(item => item.triple);

        return new Promise((resolve, reject) => resolve(response));
    }

    private static getObject(nodes): TripleObject {
        let textContent = '';
        nodes.filter(n => n.type === 'text').forEach(text => {
            textContent = textContent.concat(text.data);
        });
        return isUrl(textContent) ? {name: textContent, uri: textContent} : {name: textContent};
    }
}
