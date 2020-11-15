From centos:7.8.2003
ADD . /root
RUN ln -s /root/node-v12.19.0-linux-x64/bin/node /usr/bin/node && ln -s /root/node-v12.19.0-linux-x64/bin/npm /usr/bin/npm && ln -s /root/node-v12.19.0-linux-x64/bin/npx /usr/bin/npx
WORKDIR /root
CMD ["node", "main","3449308644"]
