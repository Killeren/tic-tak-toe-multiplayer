# Use official Nakama image
FROM heroiclabs/nakama:3.17.1

# Copy Railway production configuration as local.yml (Nakama's default)
COPY railway.yml /nakama/data/local.yml

# Copy game server logic
COPY build/ /nakama/data/modules/build/

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Rename the original nakama binary and replace it with our wrapper
RUN mv /nakama/nakama /nakama/nakama-original

# Create a wrapper script that will be called instead of nakama
RUN echo '#!/bin/sh' > /nakama/nakama && \
    echo 'exec /entrypoint.sh "$@"' >> /nakama/nakama && \
    chmod +x /nakama/nakama

# Expose ports
EXPOSE 7349 7350 7351

# The Nakama image's default ENTRYPOINT will now call our wrapper
# which will then call our entrypoint.sh
