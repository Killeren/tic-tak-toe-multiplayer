# Use official Nakama image
FROM heroiclabs/nakama:3.17.1

# Copy custom configuration
COPY local.yml /nakama/data/local.yml

# Copy game server logic
COPY build/ /nakama/data/modules/build/

# Copy startup script
COPY start-railway.sh /nakama/start-railway.sh
RUN chmod +x /nakama/start-railway.sh

# Expose ports
EXPOSE 7349 7350 7351

# Start with our custom script
CMD ["/nakama/start-railway.sh"]
