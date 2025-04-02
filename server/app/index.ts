// WARNING : Make sure to always import 'reflect-metadata' and 'module-alias/register' first
import 'module-alias/register';
import 'reflect-metadata';
import { Container } from 'typedi';
import { Server } from './server';

const server: Server = Container.get(Server);
server.init();
