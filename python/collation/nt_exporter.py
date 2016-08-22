#-*- coding: utf-8 -*-
import xml.etree.ElementTree as etree
import re
import codecs
import json
from collation.exporter import Exporter


class NTExporter(Exporter):
    
    def export_data(self, data, format='positive_xml', ignore_basetext=False):

        xml = self.get_structured_xml(data, ignore_basetext)
        if format == 'positive_xml':
            return xml

    def get_structured_xml(self, data, ignore_basetext, negative_apparatus=False):
        apptree = etree.fromstring('<TEI></TEI>')

        for entry in data:
            context = entry['context']
            book = context[context.find('B')+1:context.find('K')]
            chapter = int(context[context.find('K')+1:context.find('V')])
            verse = int(context[context.find('V')+1:])  
            vtree = self.get_unit_xml(entry, ignore_basetext, negative_apparatus) #this is ab element
            if len(apptree.findall('.//div[@type="chapter"][@xml:id="B%sK%s-APP"]' % (book, chapter), {'tei':'http://www.tei-c.org/ns/1.0', 'xml': 'http://www.w3.org/XML/1998/namespace'})) > 0:
                apptree.findall('.//div[@type="chapter"][@xml:id="B%sK%s-APP"]' % (book, chapter), {'tei':'http://www.tei-c.org/ns/1.0', 'xml': 'http://www.w3.org/XML/1998/namespace'})[0].append(vtree)
            elif len(apptree.findall('.//div[@type="book"][@xml:id="B%s-APP"]' % (book), {'tei':'http://www.tei-c.org/ns/1.0', 'xml': 'http://www.w3.org/XML/1998/namespace'})) > 0:    
                chap = etree.Element('div')
                chap.set('type', 'chapter')
                chap.set('{http://www.w3.org/XML/1998/namespace}id', 'B%sK%s-APP' % (book, chapter))
                chap.append(vtree)
                apptree.findall('.//div[@type="book"][@xml:id="B%s-APP"]' % (book), {'tei':'http://www.tei-c.org/ns/1.0', 'xml': 'http://www.w3.org/XML/1998/namespace'})[0].append(chap)
            else:
                bk = etree.Element('div')
                bk.set('type', 'book')
                bk.set('{http://www.w3.org/XML/1998/namespace}id', 'B%s-APP' % (book))
                chap = etree.Element('div')
                chap.set('type', 'chapter')
                chap.set('{http://www.w3.org/XML/1998/namespace}id', 'B%sK%s-APP' % (book, chapter))
                chap.append(vtree)
                bk.append(chap)
                apptree.append(bk)
        stringified_xml = etree.tostring(apptree, encoding='utf-8')
        xml_base = stringified_xml.replace('<TEI>', '<?xml version=\'1.0\' encoding=\'utf-8\'?><TEI xmlns="http://www.tei-c.org/ns/1.0">')
        return xml_base