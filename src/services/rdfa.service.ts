import { QueryResponse } from './../models/query-response';
import { TriplePart } from './../models/triple-part';
import { Triple } from '../models/triple';
import * as isUrl from 'is-url';

export class RDFaService {

    static getTriplesFromDom(dom: any, uri: string) {

        interface Item {
            id: number,
            triple: Triple,
            depth: number
        }

        let results: Item[] = [];
        let response: QueryResponse = {triples: [], uri: uri, resourceFormat: 'RDFa'};
        let scopeCounter = 0;
        let tripleCounter = 0;

        let parseOneNode = (nodes, currentDepth: number) => {
            let depth = currentDepth + 1;
            nodes.filter(n => n.type === 'tag').forEach(tag => {
                if (tag.attribs.hasOwnProperty('property')) {
                    let index = results.indexOf(results.filter(i => i.depth < depth).sort(i => i.id)[0]);
                    if (results[index].triple.predicate == null) {
                        results[index].triple.predicate = this.getPredicate(tag.attribs.property, results[index].triple.subject);
                        results[index].triple.object = this.getObject(tag, scopeCounter, uri);
                    } else {
                        results.push({
                            id: ++tripleCounter,
                            triple: {
                                subject: results[index].triple.subject,
                                predicate: this.getPredicate(tag.attribs.property, results[index].triple.subject),
                                object: this.getObject(tag, scopeCounter, uri)
                            }, depth: results[index].depth});
                    }
                }
                if (tag.attribs.hasOwnProperty('vocab') || tag.attribs.hasOwnProperty('prefix')) {
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
        let name, uri = null;
        if (tag.attribs.hasOwnProperty('vocab')) {
            name = tag.attribs.vocab;
            if (tag.attribs.hasOwnProperty('typeof')) name = name.concat(tag.attribs.typeof);
            if (isUrl(name)) uri = name;
        } else if (tag.attribs.hasOwnProperty('prefix')) {
            let tempArray = tag.attribs.vocab.split('dc:');
            name = tempArray[tempArray.length - 1].replace(' ', '');
            if (isUrl(name)) uri = name;
            if (tag.attribs.hasOwnProperty('resource')) name = tag.attribs.resource;
        }
        name = 'Item '.concat(String(scopeCounter)).concat(name ? ': '.concat(name) : '');
        if (uri) return {name: name, uri: uri};
        else return {name: name};
    }

    private static getPredicate(property: string, subject: TriplePart): TriplePart {
        let name: string = isUrl(property) ? property.split('/').slice(-1)[0] : property;
        let uri: string = subject.uri ? this.generatePredicateUrl(subject.uri, name) : (isUrl(property) ? property : null);
        if (uri) return {name: name, uri: uri};
        else return {name: name};
    }

    private static getObject(tag: any, scopeCounter: number, siteUri: string): TriplePart {
        let name: string;
        let uri = '';

        let isLink = false;
        if (tag.attribs.hasOwnProperty('content')) name = tag.attribs.content;
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
            uri = tag.attribs.href;
            isLink = true;
        } else if (tag.attribs.hasOwnProperty('src')) {
            if (!name) name = tag.attribs.src;
            uri = tag.attribs.src;
            isLink = true;
        }
        if (isLink) {
            if (uri.startsWith('/')) {
                let temp = uri;
                uri = '';
                siteUri.split('/').slice(0, 3).forEach(urlPart => uri = uri.concat(urlPart.concat('/')));
                uri = uri.slice(0, -1).concat(temp)
            } else {
                uri = siteUri.endsWith('/') ? siteUri.concat(uri) : siteUri.concat('/'.concat(uri));
            }
            if (!isUrl(uri)) uri = null;
        } else {
            uri = isUrl(name) ? name : null;
        }
        if (uri) return {name: name, uri: uri};
        else return {name: name};
    }

    private static generatePredicateUrl(uri: string, name: string): string {
        let response = ''
        if (uri.endsWith('/')) return uri.concat(name);
        uri.split('/').slice(0, -1).forEach(urlPart => response = response.concat(urlPart + '/'));
        return response.concat(name);
    }
}
