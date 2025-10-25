#!/bin/bash
# Railway start script
cd client/src && python3 -m http.server ${PORT:-8080}
