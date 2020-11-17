from setuptools import setup, find_packages


version = '0.1.0'

requires = [
    'setuptools >= 50.3.2',
    'Flask >= 1.1,<1.2',
    'marshmallow >= 3.9.1',
    'Flask-Babel == 2.0.0',
    'requests >= 2.25.0',
]

test_requires = [
    'pytest>=6.1.2',
    'pytest-cov>=2.10.1',
    'mock==4.0.2',
    'WebTest>=2.0.35',
]

devel_extras = test_requires + [
    'isort>=5.6.4',
    'black>=20.8b1',
    'mypy>=0.790',
]

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
      extras_require={
          'devel': devel_extras,
      },
      entry_points="""
      """,
      )
