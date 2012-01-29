class SelectorsController < ApplicationController
  def index
    @references = [
#      "DeMaster, D., I. Stirling. 1981. *Ursus maritimus*. Mammalian Species, 145: 1-7.",
#      "Epling, C., Lewis H., & Ball F. M. (1960). The Breeding Group and Seed Storage: A Study in Population Dynamics. Evolution. 14, 238-255.",
      "MACDONALD, S., & FENNIAK T. (2007). Understory plant communities of boreal mixedwood forests in western Canada: Natural patterns and response to variable-retention harvesting. Forest Ecology and Management. <span data-grabtag='volume'>242(1)</span>: 34-48."
    ]
  end
end