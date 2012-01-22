source 'http://rubygems.org'

gem 'rails', '3.1.3'
gem 'therubyracer'

# Bundle edge Rails instead:
# gem 'rails',     :git => 'git://github.com/rails/rails.git'

gem 'sqlite3'
gem 'anystyle-parser'
gem 'citeproc-ruby'
gem 'marc'
gem 'openurl'
gem 'typhoeus'

# Gems used only for assets and not required
# in production environments by default.
group :assets do
  gem 'sass-rails',   '~> 3.1.5'
  gem 'coffee-rails', '~> 3.1.1'
  gem 'uglifier', '>= 1.0.3'
end

gem 'jquery-rails'

# To use ActiveModel has_secure_password
# gem 'bcrypt-ruby', '~> 3.0.0'

# Use unicorn as the web server
# gem 'unicorn'

# Deploy with Capistrano
# gem 'capistrano'

group :test do
  # Pretty printed test output
  gem 'turn', '0.8.2', :require => false
end

group :development, :test do
  gem 'ruby-debug19', :require => 'ruby-debug'
end

group :production do
  gem 'thin'
end
