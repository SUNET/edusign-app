import os

from setuptools import setup, find_packages


here = os.path.abspath(os.path.dirname(__file__))

# To bump versions:
# * Bump here
# * bump version in package.json de frontend
# * create git tag and push
# * reference new tag in docker-edusign-app/backend/Dockerfile
# * reference new tag in docker-edusign-app/nginx/Dockerfile
version = '1.3.0r3'

requires = [x for x in open(os.path.join(here, 'requirements.txt')).read().split('\n') if len(x) > 0]
test_requires = [x for x in open(os.path.join(here, 'test_requirements.txt')).read().split('\n')
                 if len(x) > 0 and not x.startswith('-')]

long_description = open('README.txt').read()

setup(name='edusign-webapp',
      version=version,
      description="Backend for the eduSign web interface",
      long_description=long_description,
      classifiers=[
          "Programming Language :: Python",
      ],
      keywords='',
      author='SUNET',
      author_email='',
      url='https://github.com/SUNET/',
      license='bsd',
      packages=find_packages('src'),
      package_dir={'': 'src'},
      include_package_data=True,
      zip_safe=False,
      install_requires=requires,
      tests_require=test_requires,
      entry_points="""
      """,
      )
