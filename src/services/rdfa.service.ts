import { QueryResponse } from './../models/query-response';
import { TriplePart } from './../models/triple-part';
import { Triple } from '../models/triple';
import * as isUrl from 'is-url';

export class RDFaService {

    static getTriplesFromDom(dom: any, uri: string) {

        let queryResponse: QueryResponse = {triples: [], uri: uri, resourceFormat: 'RDFa'};
        let triples: Triple[] = [];
        let vocabs = new Map<string, string>();
        let scopeCounter = 0;

        let parseOneNode = (nodes, _parent: Triple, _vocab: string) => {
            let parent: Triple = _parent;
            let currentVocab: string = _vocab;
            nodes.filter(n => n.type === 'tag').forEach(tag => {
                if (tag.attribs.hasOwnProperty('vocab')) {
                    currentVocab = tag.attribs.vocab;
                    if (tag.attribs.hasOwnProperty('typeof') && tag.attribs.typeof.includes('rdfs:'))
                        vocabs.set('rdfs', currentVocab);
                }
                if (tag.attribs.hasOwnProperty('prefix')) {
                    let prefixes: string[] = tag.attribs.prefix.replace(/:\/\//g, '§§//').split(' ');
                    let currentPrefix = null;
                    for (let i = 0; i < prefixes.length; i++) {
                        if (prefixes[i].endsWith(':')) {
                            currentPrefix = prefixes[i].split(':')[0];
                        } else if (prefixes[i].split(':').length > 1) {
                            vocabs.set(prefixes[i].split(':')[0], prefixes[i].split(':')[1].replace('§§', ':'));
                        } else {
                            vocabs.set(currentPrefix, prefixes[i].replace('§§', ':'));
                        }
                    }
                    console.log(vocabs.values);
                }
                if (tag.attribs.hasOwnProperty('property')) {
                    triples.push({
                        subject: parent.subject,
                        predicate: this.getPredicate(vocabs, tag.attribs.property, parent.object),
                        object: tag.attribs.hasOwnProperty('typeof') ? this.getObject(currentVocab, vocabs, tag, uri, scopeCounter) : this.getObject(currentVocab, vocabs, tag, uri)
                    });
                }
                if (tag.attribs.hasOwnProperty('typeof')) {
                    scopeCounter++;
                    triples.push({
                        subject: {name: '_:genid' + String(scopeCounter)},
                        predicate: {name: 'rdf-syntax-ns#type', uri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'},
                        object: this.getObject(currentVocab, vocabs, tag, uri, 0, parent != null ? parent.object : null)
                    });
                    parent = triples[triples.length - 1];
                }
                if (tag.children) parseOneNode(tag.children, parent, currentVocab);
            });
        }

        parseOneNode(dom, null, '');

        queryResponse.triples = triples;

        console.log('Processed ' + String(triples.length) + ' ' + queryResponse.resourceFormat + '-Items');

        return new Promise((resolve, reject) => resolve(queryResponse));
    }

    private static getPredicate(vocabs: Map<string, string>, property: string, parentObject: TriplePart): TriplePart {
        let name: string = property;
        let uri: string = null;
        if (isUrl(property)) {
            name = property.split('/')[property.split('/').length - 1];
            uri = property;
        } else if (property.split(':').length > 1) {
            name = property.split(':')[1].replace(' ', '');
            uri = vocabs.get(property.split(':')[0]) + name;
        } else {
            uri = parentObject.uri ? this.generatePredicateUrl(parentObject.uri, name) : null;
        }
        if (uri) return {name: name, uri: uri};
        else return {name: name};
    }

    private static getObject(currentVocab: string, vocabs: Map<string, string>, tag: any, siteUri: string, scopeCounter?: number, parentObject?: TriplePart): TriplePart {
        let name: string;
        let uri = '';

        if (scopeCounter && scopeCounter > 0) {
            name = '_:genid' + String(scopeCounter + 1);
            uri = null;
        } else if (tag.attribs.hasOwnProperty('typeof')) {
            if (!isUrl(tag.attribs.typeof)) {
                if (tag.attribs.typeof.split(':').length > 1) {
                    name = tag.attribs.typeof.split(':')[1].replace(' ', '');
                    uri = vocabs.get(tag.attribs.typeof.split(':')[0]) + name;
                } else {
                    name = tag.attribs.typeof
                    uri = isUrl(currentVocab + tag.attribs.typeof) ? currentVocab + tag.attribs.typeof : null;
                }
            } else {
                name = tag.attribs.typeof.split('/')[tag.attribs.typeof.split('/').length - 1];
                uri = tag.attribs.typeof;
            }
        } else {
            let isLink = false;

            if (tag.attribs.hasOwnProperty('title'))
                name = tag.attribs.title;
            else if (tag.attribs.hasOwnProperty('content'))
                name = tag.attribs.content;
            else {
                name = '';
                tag.children.filter(node => node.type === 'text').forEach(text => {
                    name += text.data;
                });
            }

            if (tag.attribs.hasOwnProperty('href')) {
                if (!name) name = isUrl(tag.attribs.href) ? tag.attribs.href.split('/')[tag.attribs.href.split('/').length - 1] : tag.attribs.href;
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
                    siteUri.split('/').slice(0, 3).forEach(urlPart => uri += urlPart + '/');
                    uri = uri.slice(0, -1) + temp;
                } else {
                    if (!isUrl(uri)) uri = siteUri.endsWith('/') ? siteUri + uri : siteUri + '/' + uri;
                }
            } else {
                uri = isUrl(name) ? name : null;
            }
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
