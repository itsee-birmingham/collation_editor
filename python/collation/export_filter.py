

class ExportFilter(object): 
    
    @abstractmethod
    def filter_export(self, xml):
        pass