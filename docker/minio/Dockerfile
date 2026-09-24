FROM golang:1.24.2-alpine3.21 AS build

ARG MINIO_VERSION=RELEASE.2025-09-07T16-13-09Z

RUN apk add --no-cache bash ca-certificates git
RUN git clone --depth 1 --branch "${MINIO_VERSION}" https://github.com/minio/minio.git /src/minio

WORKDIR /src/minio
RUN CGO_ENABLED=0 GOOS=linux go build \
    -tags kqueue \
    -trimpath \
    -ldflags "$(go run buildscripts/gen-ldflags.go)" \
    -o /out/minio .

FROM alpine:3.21

RUN apk add --no-cache ca-certificates curl
COPY --from=build /out/minio /usr/bin/minio

LABEL org.opencontainers.image.source="https://github.com/minio/minio" \
      org.opencontainers.image.version="RELEASE.2025-09-07T16-13-09Z"

EXPOSE 9000 9001
VOLUME ["/data"]
ENTRYPOINT ["/usr/bin/minio"]
