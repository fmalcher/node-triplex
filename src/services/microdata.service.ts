import { QueryResponse } from './../models/query-response';
import { TriplePart } from './../models/triple-part';
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
                        results[index].triple.predicate = this.getPredicate(tag.attribs.itemprop, results[index].triple.subject);
                        results[index].triple.object = this.getObject(tag, scopeCounter, uri);
                    } else {
                        results.push({
                            id: ++tripleCounter,
                            triple: {
                                subject: results[index].triple.subject,
                                predicate: this.getPredicate(tag.attribs.itemprop, results[index].triple.subject),
                                object: this.getObject(tag, scopeCounter, uri)
                            }, depth: results[index].depth});
                    }
                }
                if (tag.attribs.hasOwnProperty('itemscope')) {
                    scopeCounter++;
                    results.push({
                        id: ++tripleCounter,
                        triple: {
                            subject: this.getSubject(tag, scopeCounter),
                            predicate: null,
                            object: null
                        }, depth: depth});
                }
                if (tag.children) parseOneNode(tag.children, depth);
            });
        }

        parseOneNode(dom, 0);

        response.triples = results.map(item => item.triple);

        return new Promise((resolve, reject) => resolve(response));
    }

    private static getSubject(tag: any, scopeCounter: number): TriplePart {
        let name = tag.attribs.itemscope ? tag.attribs.itemscope : (!isUrl(tag.attribs.itemtype ? tag.attribs.itemtype : null));
        name = 'Item '.concat(String(scopeCounter)).concat(name ? ', '.concat(name) : '');
        let uri = tag.attribs.hasOwnProperty('itemtype') ? (isUrl(tag.attribs.itemtype) ? tag.attribs.itemtype : null) : null;
        if (uri) return {name: name, uri: uri};
        else return {name: name};
    }

    private static getPredicate(itemprop: string, subject: TriplePart): TriplePart {
        let name: string = isUrl(itemprop) ? itemprop.split('/').slice(-1)[0] : itemprop;
        let uri: string = subject.uri ? this.generatePredicateUrl(subject.uri, name) : (isUrl(itemprop) ? itemprop : null);
        if (uri) return {name: name, uri: uri};
        else return {name: name};
    }

    private static getObject(tag: any, scopeCounter: number, siteUri: string): TriplePart {
        let name: string;
        let uri = '';

        if (tag.attribs.hasOwnProperty('itemscope') && tag.attribs.hasOwnProperty('itemprop')) {
            name = 'Item '.concat(String(scopeCounter + 1)).concat(tag.attribs.itemscope ? tag.attribs.itemscope : '');
            uri = tag.attribs.hasOwnProperty('itemtype') ? (isUrl(tag.attribs.itemtype) ? tag.attribs.itemtype : null) : null;
        } else {
            let isLink = false;
            if (tag.attribs.hasOwnProperty('content')) name = tag.attribs.content;
            else if (tag.attribs.hasOwnProperty('text')) name = tag.attribs.text;
            else {
                name = '';
                tag.children.filter(node => node.type === 'text').forEach(text => {
                    name = name.concat(text.data);
                });
            }
            if (tag.attribs.hasOwnProperty('title')) {
                name = tag.attribs.title;
            } else if (tag.attribs.hasOwnProperty('href')) {
                if (!name) name = tag.attribs.href;
                isLink = true;
            } else if (tag.attribs.hasOwnProperty('src')) {
                if (!name) name = tag.attribs.src;
                isLink = true;
            }
            if (isLink) {
                if (isUrl(name)) uri = name;
                else {
                    if (name.startsWith('/')) {
                        siteUri.split('/').slice(0, 3).forEach(urlPart => uri = uri.concat(urlPart.concat('/')));
                        uri = uri.slice(0, -1).concat(name)
                    } else {
                        uri = siteUri.endsWith('/') ? siteUri.concat(name) : siteUri.concat('/'.concat(name));
                    }
                }
                if (!isUrl(uri)) uri = null;
            } else {
                uri = isUrl(name) ? name : null;
            }
        }
        if (uri) return {name: name, uri: uri};
        else return {name: name};
    }

    private static generatePredicateUrl(uri: string, name: string): string {
        let response = ''
        uri.split('/').slice(0, -1).forEach(urlPart => response = response.concat(urlPart + '/'));
        return response.concat(name);
    }
}
