class ExamplesController < ApplicationController
  def index
    @references = [
      "DeMaster, D., I. Stirling. 1981. *Ursus maritimus*. Mammalian Species, 145: 1-7.",
      "Epling, C., Lewis H., & Ball F. M. (1960). The Breeding Group and Seed Storage: A Study in Population Dynamics. Evolution. 14, 238-255.",
      "MACDONALD, S., & FENNIAK T. (2007). Understory plant communities of boreal mixedwood forests in western Canada: Natural patterns and response to variable-retention harvesting. Forest Ecology and Management. 242(1): 34-48.",
      "Williston, Samuel W. (1908). Manual of North American Diptera. New Haven: J.T. Hathaway."
    ]
  end
end
