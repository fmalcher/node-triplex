import { QueryResponse } from './../models/query-response';
import { TripleObject } from './../models/triple-object';
import { TripleSet } from '../models/triple-set';
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
            tripleSet: TripleSet,
            depth: number
        }

        let results: Item[] = [];
        let triples: QueryResponse = {tripleSets: [], uri: uri, resourceFormat: 'microdata'};
        let scopeCounter = 0;
        let tripleCounter = 0;

        let parseOneNode = (nodes, currentDepth: number) => {
            let depth = currentDepth + 1;
            nodes.filter(n => n.type === 'tag').forEach(tag => {
                if (tag.attribs.hasOwnProperty('itemprop')) {
                    let index = results.indexOf(results.filter(i => i.depth < depth).sort(i => i.id)[0]);
                    if (results[index].tripleSet.predicate == null) {
                        results[index].tripleSet.predicate = tag.attribs.itemprop;
                        results[index].tripleSet.object = this.getObject(tag.children);
                    } else {
                        results.push({id: ++tripleCounter, tripleSet: {subject: results[index].tripleSet.subject, predicate: tag.attribs.itemprop, object: this.getObject(tag.children)}, depth: results[index].depth});
                    }
                }
                if (tag.attribs.hasOwnProperty('itemscope')) {
                    scopeCounter++;
                    results.push({id: ++tripleCounter, tripleSet: {subject: String(scopeCounter), predicate: null, object: null}, depth: depth});
                }
                if (tag.children) parseOneNode(tag.children, depth);
            });
        }

        parseOneNode(dom, 0);

        results.forEach(item => triples.tripleSets.push(item.tripleSet));

        return new Promise((resolve, reject) => resolve(triples));
    }

    private static getObject(nodes): TripleObject {
        let textContent = '';
        nodes.filter(n => n.type === 'text').forEach(text => {
            textContent = textContent.concat(text.data);
        });
        return isUrl(textContent) ? {name: textContent, uri: textContent} : {name: textContent};
    }
}
