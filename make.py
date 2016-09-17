#!/usr/bin/python
# -*- coding: utf-8 -*-

# make.py: simple project make/util tool
#
# Author: Tomi.Mickelsson@iki.fi

import sys
import tempfile
import shutil
import os


def build_release():
    print "build_release"

    # files in release
    FILES = ["bg.js", "load.js", "manifest.json", "css.ini",
            "maintab.html", "maintab.js", "maintab.css",
            "options.html", "options.js", "options.css",
            "config.js", "gear19.png", "gear128.png",
            "ext/beautify-css.min.js",
            "ext/beautify-html.min.js",
            "ext/beautify.min.js",
            "ext/googlecode.css",
            "ext/highlight.pack.js",
            "ext/zepto.min.js",
            ]

    # temp dir
    dir = tempfile.mkdtemp(suffix="")
    print "created", dir

    # copy files
    os.mkdir(dir+"/ext")
    for x in FILES:
        shutil.copyfile(x, dir+"/"+x)

    # make zip
    print "compressing files"
    for i, x in enumerate(os.listdir(dir)):
        print "  ", i+1, x

    shutil.make_archive("./release", "zip", dir)
    print "release.zip created"

    print "deleting", dir
    shutil.rmtree(dir)


def main():
    cmd = sys.argv[1]

    if cmd == "release":
        build_release()
    else:
        print "error!"

main()

